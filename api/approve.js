const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    console.log('Approving payment:', paymentId);

    const response = await fetch('https://api.minepi.com/v2/payments/' + paymentId + '/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + process.env.PI_API_KEY
      },
      body: JSON.stringify({
        txid: paymentId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Payment approval failed:', data);
      return res.status(response.status).json({ error: data.message || 'Payment approval failed' });
    }

    console.log('Payment approved successfully:', data);
    res.json({ success: true, data });

  } catch (error) {
    console.error('Error in approve.js:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
