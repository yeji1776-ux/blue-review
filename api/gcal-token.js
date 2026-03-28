export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { code, redirect_uri } = req.body;
  if (!code || !redirect_uri) return res.status(400).json({ error: 'missing params' });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } else {
    res.status(400).json({ error: data.error, description: data.error_description });
  }
}
