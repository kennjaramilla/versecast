import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Control from './control/Control'
import Display from './display/Display'

const router = createBrowserRouter([
  { path: '/', element: <Control /> },
  { path: '/display', element: <Display /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
