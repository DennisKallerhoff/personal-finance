import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";

interface ClassificationInput {
  transaction_id: string;
  raw_vendor: string;
  normalized_vendor: string;
  description: string;
  amount: number;  // cents
  direction: 'debit' | 'credit';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool for structured output
const classificationTool = {
  name: "classify_transaction",
  description: "Classify a German household financial transaction into a category",
  input_schema: {
    type: "object",
    properties: {
      category_name: {
        type: "string",
        description: "Category name from the provided list (exact match required)"
      },
      reasoning: {
        type: "string",
        description: "Brief explanation in German or English (1-2 sentences)"
      }
    },
    required: ["category_name", "reasoning"]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY")!
  });

  try {
    const input = await req.json() as ClassificationInput;

    // Fetch category tree (parent categories only for simpler prompt)
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, parent_id')
      .order('sort_order');

    if (!categories || categories.length === 0) {
      throw new Error('No categories found in database');
    }

    // Build category list (include both parent and child categories)
    const categoryList = categories
      .map(c => `- ${c.name}`)
      .join('\n');

    // Build prompt (minimal data for privacy)
    const isExpense = input.direction === 'debit';
    const euros = (input.amount / 100).toFixed(2);

    const prompt = `Kategorisiere diese Transaktion für ein deutsches Haushaltsbuch:

Händler: ${input.normalized_vendor}
Betrag: ${euros} EUR (${isExpense ? 'Ausgabe' : 'Einnahme'})
Beschreibung: ${input.description || 'keine'}

Verfügbare Kategorien:
${categoryList}

Regeln:
- Wähle die passendste Kategorie basierend auf dem Händler
- Bei Unsicherheit wähle die allgemeinere Kategorie
- "Sonstiges" nur wenn nichts passt
- Für Einnahmen nutze "Gehalt", "Nebeneinkommen" oder "Erstattungen"

Nutze das classify_transaction Tool.`;

    // Call Claude Haiku for speed and cost
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 256,
      temperature: 0.0,
      tools: [classificationTool],
      messages: [{ role: "user", content: prompt }]
    });

    // Extract tool result
    const toolUse = response.content.find(
      (block: any) => block.type === "tool_use"
    );

    if (!toolUse) {
      throw new Error("No classification returned from LLM");
    }

    const classification = toolUse.input as {
      category_name: string;
      reasoning: string;
    };

    // Map category name to ID (case-insensitive)
    const category = categories.find(
      c => c.name.toLowerCase() === classification.category_name.toLowerCase()
    );

    if (!category) {
      console.warn('LLM returned unknown category:', classification.category_name);
      // Return null category if LLM hallucinates a category name
      return new Response(
        JSON.stringify({
          success: true,
          category_id: null,
          category_name: null,
          confidence: null,
          reasoning: `Unknown category: ${classification.category_name}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update transaction with LLM classification
    await supabase
      .from('transactions')
      .update({
        category_id: category.id,
        confidence: 'low',
        is_reviewed: false  // Still needs review for low confidence
      })
      .eq('id', input.transaction_id);

    // Log classification for debugging
    console.log('LLM classification:', {
      op: 'classify_llm',
      vendor: input.normalized_vendor,
      category: classification.category_name,
      reasoning: classification.reasoning
    });

    return new Response(
      JSON.stringify({
        success: true,
        category_id: category.id,
        category_name: classification.category_name,
        confidence: 'low',
        reasoning: classification.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Classification error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Classification failed',
        category_id: null,
        confidence: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
