import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <motion.div
          className="loading-icon"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Shield size={48} />
        </motion.div>
        
        <motion.h2
          className="loading-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Secure Password Manager
        </motion.h2>
        
        <motion.p
          className="loading-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>

        <motion.div
          className="loading-spinner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="spinner-bar"></div>
          <div className="spinner-bar"></div>
          <div className="spinner-bar"></div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen; 