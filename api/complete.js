const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, txid } = req.body;

    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Payment ID and TXID are required' });
    }

    console.log('Completing payment:', paymentId, txid);

    const response = await fetch('https://api.minepi.com/v2/payments/' + paymentId + '/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + process.env.PI_API_KEY
      },
      body: JSON.stringify({
        txid: txid
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Payment completion failed:', data);
      return res.status(response.status).json({ error: data.message || 'Payment completion failed' });
    }

    console.log('Payment completed successfully:', data);
    res.json({ success: true, data });

  } catch (error) {
    console.error('Error in complete.js:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
