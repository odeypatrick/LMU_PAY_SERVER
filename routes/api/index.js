const router = require('express').Router()
const axios = require('axios')
const User = require("../../models/User");
const Wallet = require("../../models/wallet");
const WalletTransaction = require("../../models/wallet_transaction");
const Transaction = require("../../models/transaction");

// Validating User wallet
const validateUserWallet = async (userId) => {
    try {
      // check if user have a wallet, else create wallet
      const userWallet = await Wallet.findOne({ userId });
  
      // If user wallet doesn't exist, create a new one
      if (!userWallet) {
        // create wallet
        const wallet = await Wallet.create({
          userId,
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

  module.exports = router;