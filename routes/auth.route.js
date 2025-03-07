const express = require('express');
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const UserModel = require('../models/user.model');

// middleware 
const { generateAccessToken, authenticateToken, generateRefreshToken } = require('../middlewares/authware');

// new token 
router.post('/token', async (req, res) => {
    const refreshToken = req.body.token;
    const tokenValid = await UserModel.exists({ refreshToken: refreshToken }).exec();
    if (refreshToken == null) {
      return res.status(401).json({
        message: "Token not available"
      });
    }

    console.log('Token Valid : ', tokenValid);

    if (!tokenValid) {
      return res.sendStatus(403);
    }
  
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, user) => {
      if (err) {
        console.log('JWT Verify error : ', err);
        return res.sendStatus(403);
      }
      const user_info = { name: user.name, email: user.email, _id: user._id };
      const accessToken = generateAccessToken(user_info);
      const newRefreshToken = generateRefreshToken(user_info);
  
      // refreshTokens.push(newRefreshToken);
      await UserModel.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken }).exec();
      return res.json({ accessToken: accessToken, refreshToken: newRefreshToken });
    });
  });

// delete access token 
router.delete('/logout', async (req, res) => {
    await UserModel.findOneAndDelete({ refreshToken: req.body.token }).exec();
    res.sendStatus(204);
})

// register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, company, occupation } = req.body;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.create({
      name,
      email,
      password: hashedPassword,
      company,
      occupation
    });

    res.status(201).json({ message: 'User Created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await UserModel.findOne({ email: email });
  
      if (user) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
  
        if (isPasswordValid) {
          const user_info = { name: user.name, email: user.email, _id: user._id };
          const userdata = {
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImg: user.profileImg,
            role: user.role,
          };
  
          const accessToken = generateAccessToken(user_info);
          const refreshToken = jwt.sign(user_info, process.env.REFRESH_TOKEN_SECRET);
  
          // refreshTokens.push(refreshToken);
          await UserModel.findByIdAndUpdate(user._id, { refreshToken: refreshToken }).exec();
  
          return res.json({ accessToken, refreshToken, user: userdata });
        } else {
          return res.json({ user: false, message: "Invalid password" });
        }
      } else {
        return res.json({ user: false, message: "User not found" });
      }
    } catch (e) {
      console.log(e);
      res.json({ status: 'error', user: false });
    }
  });
  


router.post("/users", authenticateToken, async (req, res) => {
    if (req.user) {
        const allusers = await UserModel.find();
        res.json({ allusers: allusers });
    } else {
        res.json("You are not allowed to perform action!");
    }
});

module.exports = router;