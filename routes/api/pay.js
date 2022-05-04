const router = require('express').Router()
const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

// The route where we initiate payment (Steps 1 - 3)
app.post('/pay', async (req, res) => {
    const payload = {
        card_number: req.body.card_number,
        cvv: req.body.card_cvv,
        expiry_month: req.body.card_expiry_month,
        expiry_year: req.body.card_expiry_year,
        currency: 'NGN',
        amount: req.body.price,
        email: req.user.email,
        fullname: req.body.card_name,
        // Generate a unique transaction reference
        tx_ref: generateTransactionReference(),
        redirect_url: process.env.APP_BASE_URL + '/pay/redirect',
        enckey: process.env.FLW_ENCRYPTION_KEY
    }
    const response = await flw.Charge.card(payload);

    switch (response?.meta?.authorization?.mode) {
        case 'pin':
        case 'avs_noauth':
            // Store the current payload
            req.session.charge_payload = payload;
            // Now we'll show the user a form to enter
            // the requested fields (PIN or billing details)
            req.session.auth_fields = response.meta.authorization.fields;
            req.session.auth_mode = response.meta.authorization.mode;
            return res.redirect('/pay/authorize');
        case 'redirect':
            // Store the transaction ID
            // so we can look it up later with the flw_ref
            await redis.setAsync(`txref-${response.data.tx_ref}`, response.data.id);
            // Auth type is redirect,
            // so just redirect to the customer's bank
            const authUrl = response.meta.authorization.redirect;
            return res.redirect(authUrl);
        default:
            // No authorization needed; just verify the payment
            const transactionId = response.data.id;
            const transaction = await flw.Transaction.verify({ id: transactionId });
            if (transaction.data.status == "successful") {
                return res.redirect('/payment-successful');
            } else if (transaction.data.status == "pending") {
                // Schedule a job that polls for the status of the payment every 10 minutes
                transactionVerificationQueue.add({id: transactionId});
                return res.redirect('/payment-processing');
            } else {
                return res.redirect('/payment-failed');
            }
    }
});


// The route where we send the user's auth details (Step 4)
app.post('/pay/authorize', async (req, res) => {
    const payload = req.session.charge_payload;
    // Add the auth mode and requested fields to the payload,
    // then call chargeCard again
    payload.authorization = {
        mode: req.session.auth_mode,
    };
    req.session.auth_fields.forEach(field => {
        payload.authorization.field = req.body[field];
    });
    const response = await flw.Charge.card(payload);

    switch (response?.meta?.authorization?.mode) {
        case 'otp':
            // Show the user a form to enter the OTP
            req.session.flw_ref = response.data.flw_ref;
            return res.redirect('/pay/validate');
        case 'redirect':
            const authUrl = response.meta.authorization.redirect;
            return res.redirect(authUrl);
        default:
            // No validation needed; just verify the payment
            const transactionId = response.data.id;
            const transaction = await flw.Transaction.verify({ id: transactionId });
            if (transaction.data.status == "successful") {
                return res.redirect('/payment-successful');
            } else if (transaction.data.status == "pending") {
                // Schedule a job that polls for the status of the payment every 10 minutes
                transactionVerificationQueue.add({id: transactionId});
                return res.redirect('/payment-processing');
            } else {
                return res.redirect('/payment-failed');
            }
    }
});


// The route where we validate and verify the payment (Steps 5 - 6)
app.post('/pay/validate', async (req, res) => {
    const response = await flw.Charge.validate({
        otp: req.body.otp,
        flw_ref: req.session.flw_ref
    });
    if (response.data.status === 'successful' || response.data.status === 'pending') {
        // Verify the payment
        const transactionId = response.data.id;
        const transaction = flw.Transaction.verify({ id: transactionId });
        if (transaction.data.status == "successful") {
            return res.redirect('/payment-successful');
        } else if (transaction.data.status == "pending") {
            // Schedule a job that polls for the status of the payment every 10 minutes
            transactionVerificationQueue.add({id: transactionId});
            return res.redirect('/payment-processing');
        }
    }

    return res.redirect('/payment-failed');
});

// Our redirect_url. For 3DS payments, Flutterwave will redirect here after authorization,
// and we can verify the payment (Step 6)
app.post('/pay/redirect', async (req, res) => {
    if (req.query.status === 'successful' || req.query.status === 'pending') {
        // Verify the payment
        const txRef = req.query.tx_ref;
        const transactionId = await redis.getAsync(`txref-${txRef}`);
        const transaction = flw.Transaction.verify({ id: transactionId });
        if (transaction.data.status == "successful") {
            return res.redirect('/payment-successful');
        } else if (transaction.data.status == "pending") {
            // Schedule a job that polls for the status of the payment every 10 minutes
            transactionVerificationQueue.add({id: transactionId});
            return res.redirect('/payment-processing');
        }
    }

    return res.redirect('/payment-failed');
});

module.exports = router;