import { useEffect } from 'react'

function App() {

  useEffect(() => {
  window.api.onLog((log) => {
    console.log(log);
  });
}, []);


  const run = async () => {
    await window.api.run({
    url: "https://example.com",
    sector: "52784",
    sectorName: "PAVONI ALTA",
    cantidad: 1,
    personas: [{ socio: "123", dni: "12345678" }],
    horaHabilitacion: "18:00:00",
    simulateLocal: true,
  });
  }

  return <button onClick={run}>Probar IPC</button>
}

export default App
