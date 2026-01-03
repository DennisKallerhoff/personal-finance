import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { extractText } from "npm:unpdf";

import { parseING } from "../shared/pdf/ing-parser.ts";
import { parseDKB } from "../shared/pdf/dkb-parser.ts";
import { BadInputError, UpstreamFailError } from "../shared/errors.ts";
import type { ParseResult } from "../shared/pdf/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the PDF file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bankType = formData.get('bank') as string | null;

    if (!file) {
      throw new BadInputError('No file provided');
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new BadInputError('File must be a PDF');
    }

    // Read file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Extract text from PDF
    let text: string;
    try {
      const result = await extractText(buffer);
      text = result.text;
    } catch (e) {
      throw new UpstreamFailError('Failed to extract text from PDF', e as Error);
    }

    // Detect bank type if not provided
    const detectedBank = bankType || detectBankType(text, file.name);

    if (!detectedBank) {
      throw new BadInputError('Could not detect bank type. Please specify bank=ing or bank=dkb');
    }

    // Parse based on bank type
    let parseResult: ParseResult;

    if (detectedBank === 'ing') {
      parseResult = parseING(text);
    } else if (detectedBank === 'dkb') {
      parseResult = parseDKB(text);
    } else {
      throw new BadInputError(`Unknown bank type: ${detectedBank}`);
    }

    // Return parsed transactions
    return new Response(
      JSON.stringify({
        success: true,
        filename: file.name,
        ...parseResult
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Import error:', error);

    if (error instanceof BadInputError) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectBankType(text: string, filename: string): 'ing' | 'dkb' | null {
  // Check filename first
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.includes('girokonto') || lowerFilename.includes('ing')) {
    return 'ing';
  }
  if (lowerFilename.includes('kreditkarte') || lowerFilename.includes('dkb')) {
    return 'dkb';
  }

  // Check content
  if (text.includes('ING-DiBa') || text.includes('Girokonto Nummer')) {
    return 'ing';
  }
  if (text.includes('Miles & More') || text.includes('Kreditkartenabrechnungen')) {
    return 'dkb';
  }

  return null;
}
