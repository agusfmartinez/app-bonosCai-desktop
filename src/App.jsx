function App() {
  const run = async () => {
    const res = await window.api.run({ test: true })
    console.log(res)
  }

  return <button onClick={run}>Probar IPC</button>
}

export default App
