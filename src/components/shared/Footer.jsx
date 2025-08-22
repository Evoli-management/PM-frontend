import React from 'react'

const Footer = () => {
  return (
  <div className="bg-blue-400 text-white text-center p-4">
      <p>©{ new Date().getFullYear() } Practical Manager. All rights reserved.</p>
    </div>
  )
}

export default Footer