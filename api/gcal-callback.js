export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.redirect('/?gcal_error=no_code');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `https://www.blue-review.com/api/gcal-callback`,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    const expiry = Date.now() + data.expires_in * 1000;
    let hash = `gcal_token=${data.access_token}&gcal_expiry=${expiry}`;
    if (data.refresh_token) {
      hash += `&gcal_refresh=${data.refresh_token}`;
    }
    res.redirect(`/#${hash}`);
  } else {
    res.redirect('/?gcal_error=' + (data.error || 'unknown'));
  }
}
