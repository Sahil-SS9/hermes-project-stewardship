// A port nothing is listening on, chosen by the operating system.
// A test that starts its own backend must not pick a random number from a
// range: a server already on that port answers the health check and quietly
// receives every call the test makes. (Checks round 1, 09/10: practice servers
// on 19761-19763 sat inside vision-screen's random range and failed the gate.)
import net from 'node:net'

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}
