import { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import LocationScreen from './components/LocationScreen'
import SelfieScreen from './components/SelfieScreen'
import SuccessScreen from './components/SuccessScreen'
import './App.css'

const SCREEN = { LOGIN: 0, LOCATION: 1, SELFIE: 2, SUCCESS: 3 }

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LOGIN)
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [location, setLocation] = useState(null)
  const [branch, setBranch] = useState(null)
  const [result, setResult] = useState(null)

  function reset() {
    setScreen(SCREEN.LOGIN)
    setUser(null); setEmployee(null)
    setLocation(null); setBranch(null); setResult(null)
  }

  return (
    <div className="app">
      {screen === SCREEN.LOGIN && (
        <LoginScreen onSuccess={(u, emp) => {
          setUser(u); setEmployee(emp); setScreen(SCREEN.LOCATION)
        }} />
      )}
      {screen === SCREEN.LOCATION && (
        <LocationScreen
          user={user}
          onSuccess={(loc, br) => { setLocation(loc); setBranch(br); setScreen(SCREEN.SELFIE) }}
          onLogout={reset}
        />
      )}
      {screen === SCREEN.SELFIE && (
        <SelfieScreen
          user={user}
          employee={employee}
          branch={branch}
          location={location}
          onSuccess={(res) => { setResult(res); setScreen(SCREEN.SUCCESS) }}
          onLogout={reset}
        />
      )}
      {screen === SCREEN.SUCCESS && (
        <SuccessScreen
          user={user}
          employee={employee}
          branch={branch}
          result={result}
          onLogout={reset}
        />
      )}
    </div>
  )
}
