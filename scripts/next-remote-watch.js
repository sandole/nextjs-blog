#!/usr/bin/env node

const chalk = require('chalk')
const chokidar = require('chokidar')
const program = require('commander')
const http = require('http')
const SocketIO = require('socket.io')
const express = require('express')
const spawn = require('child_process').spawn
const next = require('next')
const path = require('path')
const { parse } = require('url')

const pkg = require('../package.json')

const defaultWatchEvent = 'change'

program.storeOptionsAsProperties().version(pkg.version)
program
  .option('-r, --root [dir]', 'root directory of your nextjs app')
  .option('-s, --script [path]', 'path to the script you want to trigger on a watcher event', false)
  .option('-c, --command [cmd]', 'command to execute on a watcher event', false)
  .option(
    '-e, --event [name]',
    `name of event to watch, defaults to ${defaultWatchEvent}`,
    defaultWatchEvent
  )
  .option('-p, --polling [name]', `use polling for the watcher, defaults to false`, false)
  .parse(process.argv)

const shell = process.env.SHELL
const app = next({ dev: true, dir: program.root || process.cwd() })
const port = parseInt(process.env.PORT, 10) || 3000
const handle = app.getRequestHandler()

app.prepare().then(() => {
  if (program.args.length > 0) {
    chokidar
      .watch(program.args, { usePolling: Boolean(program.polling) })
      .on(program.event, async (filePathContext, eventContext = defaultWatchEvent) => {
        // Emit changes via socketio
        io.sockets.emit('reload', filePathContext)
        app.server.hotReloader.send('building')

        if (program.command) {
          spawn(
            shell,
            [
              '-c',
              program.command
                .replace(/\{event\}/gi, filePathContext)
                .replace(/\{path\}/gi, eventContext),
            ],
            {
              stdio: 'inherit',
            }
          )
        }

        if (program.script) {
          try {
            const scriptPath = path.join(process.cwd(), program.script.toString())
            const executeFile = require(scriptPath)

            executeFile(filePathContext, eventContext)
          } catch (e) {
            console.error('Remote script failed')
            console.error(e)
            return e
          }
        }

        app.server.hotReloader.send('reloadPage')
      })
  }

  const expressApp = express()
  const server = http.createServer(expressApp)
  const io = SocketIO(server)
  const reloadRoute = express.Router()
  reloadRoute.use(express.json())
  reloadRoute.all('/', (req, res) => {
    const msg = req.body.message
    const color = req.body.color
    msg && console.log(color ? chalk[color](msg) : msg)
    app.server.hotReloader.send('building')
    app.server.hotReloader.send('reloadPage')
    res.end('Reload initiated')
  })

  expressApp.use('/__next_reload', reloadRoute)

  expressApp.all('*', (req, res) => handle(req, res, parse(req.url, true)))
  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  })
})