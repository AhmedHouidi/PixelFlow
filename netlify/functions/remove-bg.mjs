const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return jsonError('Background removal is not configured. Please add REMOVE_BG_API_KEY in Netlify.', 503);
  }

  try {
    const incoming = await request.formData();
    const image = incoming.get('image_file');

    if (!(image instanceof File)) {
      return jsonError('Please upload an image file.', 400);
    }

    if (!image.type.startsWith('image/')) {
      return jsonError('Only image files are supported.', 400);
    }

    if (image.size > 22 * 1024 * 1024) {
      return jsonError('The image is too large. Please use an image under 22 MB.', 413);
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
      const status = response.status;
      let providerMessage = '';

      try {
        const data = await response.json();
        providerMessage = data?.errors?.[0]?.title || data?.error || '';
      } catch {
        try {
          providerMessage = await response.text();
        } catch {
          // Keep the generic message below.
        }
      }

      console.error('remove.bg error:', status, providerMessage);

      if (status === 401 || status === 403) {
        return jsonError('The background removal API key is invalid or not authorized.', 502);
      }
      if (status === 402) {
        return jsonError('The free background-removal API limit has been reached.', 402);
      }
      if (status === 429) {
        return jsonError('The background-removal service is temporarily busy. Please try again shortly.', 429);
      }
      if (status === 400) {
        return jsonError(providerMessage || 'This image could not be processed. Try another image.', 400);
      }

      return jsonError('The background-removal service could not process this image.', 502);
    }

    const result = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    if (!contentType.startsWith('image/')) {
      return jsonError('The background-removal service returned an invalid result.', 502);
    }

    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline; filename="background-removed.png"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Background removal function failed:', error);
    return jsonError('Something went wrong while removing the background. Please try again.', 500);
  }
};
