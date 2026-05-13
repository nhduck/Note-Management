import { useState } from 'react'
import LoginPage from './pages/LoginPage.jsx'
import HomePage from './pages/HomePage.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      {/* <LoginPage></LoginPage> */}
      <HomePage></HomePage>
    </>
  )
}

export default App
