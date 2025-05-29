import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const loginUser = async (req, res, next) => {
  try {
    const { email,password } = req.body;
    console.log(email,password);
    
    if(!email||!password) return res.status(400).json({message:'Email and password required'});
    const user = await User.findOne({ email });
    if(!user||!await bcrypt.compare(password,user.password))
      return res.status(401).json({message:'Invalid credentials'});
    const token = jwt.sign({ id:user._id, role:user.role }, process.env.JWT_SECRET, { expiresIn:'30d' });
    res.cookie('token', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'Lax', maxAge:30*24*60*60*1000 });
    res.json({ message:'Login successful', user:{ id:user._id,email:user.email,role:user.role } });
  } catch(err){ next(err); }
};

export const registerUser = async (req,res,next)=>{
  try{
    const { email,password, role } = req.body;
    if(!email||!password) return res.status(400).json({message:'Email and password required'});
    if(await User.findOne({ email })) return res.status(400).json({message:'User exists'});
    const hashed = await bcrypt.hash(password,10);
    const user = await User.create({ email, password:hashed, role });
    res.status(201).json({ message:'User registered' });
  } catch(err){ next(err); }
};

export const logoutUser = (req,res) => {
  res.cookie('token','',{httpOnly:true,expires:new Date(0)});
  res.json({message:'Logged out'});
};