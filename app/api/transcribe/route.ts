import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio') as Blob | null;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio file is required.' },
        { status: 400 }
      );
    }

    // Forward to ElevenLabs Speech-to-Text API
    const elevenlabsForm = new FormData();
    elevenlabsForm.append('file', audio, 'recording.webm');
    elevenlabsForm.append('model_id', 'scribe_v1');
    elevenlabsForm.append('language_code', 'eng');

    const sttResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenlabsForm,
    });

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('ElevenLabs STT error:', sttResponse.status, errorText);
      return NextResponse.json(
        { error: `ElevenLabs STT returned ${sttResponse.status}: ${errorText}` },
        { status: sttResponse.status }
      );
    }

    const result = await sttResponse.json();
    return NextResponse.json({ text: result.text ?? '' });
  } catch (error) {
    console.error('Transcribe API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
