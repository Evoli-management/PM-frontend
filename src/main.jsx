// import React, { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App'


// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//       <App />
//   </StrictMode>,
// )


import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/Home.jsx'
import Pricing from "./pages/Pricing.jsx";
import Login from "./pages/Login.jsx";
import PasswordPageForget from "./pages/PasswordPageForget.jsx"
import ResetPasswordpage from "./pages/ResetPasswordpage.jsx";
import Testimonials from "./pages/Testimonials.jsx";
import { createBrowserRouter, RouterProvider } from 'react-router-dom'


const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />,
    },
    {
        path: "/pricing",
        element: <Pricing />,
    },
    {
        path: "/testimonials",
        element: <Testimonials />,
    },
 
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <RouterProvider router={router} />
      {/* <Login/> */}
      {/* <PasswordPageForget/> */}
      <ResetPasswordpage/>
  </StrictMode>
)
