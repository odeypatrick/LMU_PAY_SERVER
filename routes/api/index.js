const router = require('express').Router()
const axios = require('axios')
const User = require("../../models/User");
const Wallet = require("../../models/wallet");
const WalletTransaction = require("../../models/wallet_transaction");
const Transaction = require("../../models/transaction");
const Ravepay = require('flutterwave-node');

// Validating User wallet
const validateUserWallet = async (userId) => {
    try {
      // check if user have a wallet, else create wallet
      const userWallet = await Wallet.findOne({ userId });
      const user = await User.findOne({ userId });
  
      // If user wallet doesn't exist, create a new one
      if (!userWallet) {
        // create wallet
        const wallet = await Wallet.create({
          userId,
          regNumber: user.regNumber
        });
        return wallet;
      }
      return userWallet;
    } catch (error) {
      console.log(error);
    }
  };
  
  // Create Wallet Transaction
  const createWalletTransaction = async (userId, status, currency, amount) => {
    try {
      // create wallet transaction
      const walletTransaction = await WalletTransaction.create({
        amount,
        userId,
        isInflow: true,
        currency,
        status,
      });
      return walletTransaction;
    } catch (error) {
      console.log(error);
    }
  };
  
  // Create Transaction
  const createTransaction = async (
    userId,
    id,
    status,
    currency,
    amount,
    customer
  ) => {
    try {
      // create transaction
      const transaction = await Transaction.create({
        userId,
        transactionId: id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone_number,
        amount,
        currency,
        paymentStatus: status,
        paymentGateway: "flutterwave",
      });
      return transaction;
    } catch (error) {
      console.log(error);
    }
  };
  
  // Update wallet 
  const updateWallet = async (userId, amount) => {
    try {
      // update wallet
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: amount } },
        { new: true }
      );
      return wallet;
    } catch (error) {
      console.log(error);
    }
  };

  // Deduct money from wallet
  const deductWallet = async (regNumber, amount) => {
    try {
      // update wallet
      const wallet = await Wallet.findOneAndUpdate(
        { regNumber },
        { $inc: { balance: -amount } },
        { new: true }
      );
      return wallet;
    } catch (error) {
      console.log(error);
    }
  };

  router.get("/response/:transaction_id", async (req, res) => {
    const { transaction_id } = req.params;
  
    // URL with transaction ID of which will be used to confirm transaction status
    const url = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
  
    // Network call to confirm transaction status
    const response = await axios({
      url,
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `${process.env.FLW_SECRET_KEY}`,
      },
    });
  
    const { status, currency, id, amount, customer } = response.data.data;
  
    // check if customer exist in our database
    const user = await User.findOne({ email: customer.email });
  
    // check if user have a wallet, else create wallet
    const wallet = await validateUserWallet(user._id);
  
    // create wallet transaction
    await createWalletTransaction(user._id, status, currency, amount);
  
    // create transaction
    await createTransaction(user._id, id, status, currency, amount, customer);
  
    await updateWallet(user._id, amount);
  
    return res.status(200).json({
      response: "wallet funded successfully",
      data: wallet,
    });
  });

  router.get("/wallet/:userId/balance", async (req, res) => {
    try {
      const { userId } = req.params;
  
      const wallet = await Wallet.findOne({ userId });
      // user
      res.status(200).json(wallet.balance);
    } catch (err) {
      console.log(err);
    }
  });

  const rave = new Ravepay(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

  const transfer = async () => {
      try {
          const payload = {
              "account_bank": "044",
              "account_number": "2217317517",
              "amount": 500,
              "narration": "New transfer",
              "currency": "NGN",
              "reference":"trans-"+ Date.now()
          }
          const response = await rave.Transfer.initiate(payload)
          console.log(response)

      } catch (error) {
          console.log(error)
      }
  }

  router.post('/wallet/charge', async (req, res) => {
    const { regNumber, amount } = req.body
    // console.log(regNumber)
    await deductWallet(regNumber, amount);
    
    await transfer();

    return res.status(200).json({
      response: "wallet deducted successfully",
    });
  })

  module.exports = router;