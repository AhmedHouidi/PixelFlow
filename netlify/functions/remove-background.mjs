const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Background removal service is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const incoming = await request.formData();
    const image = incoming.get('image_file');

    if (!(image instanceof File)) {
      return Response.json({ error: 'Please upload an image file.' }, { status: 400 });
    }

    if (!image.type.startsWith('image/')) {
      return Response.json({ error: 'Only image files are supported.' }, { status: 400 });
    }

    const formData = new FormData();
    formData.append('image_file', image, image.name || 'image');
    formData.append('size', 'auto');

    const response = await fetch(REMOVE_BG_URL, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('remove.bg error:', response.status, details);

      return Response.json(
        { error: 'The background removal service could not process this image.' },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
      );
    }

    const result = await response.arrayBuffer();

    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Background removal function failed:', error);
    return Response.json(
      { error: 'Something went wrong while removing the background.' },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/remove-background',
};
