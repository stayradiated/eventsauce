const express = require('express')
const EventSourceEmitter = require('event-source-emitter')
const EventEmitter = require('events')
const bodyParser = require('body-parser')

// event id
const MESSAGE = 'msg'

// simple web server
const app = express()
app.use(express.static('.'))
app.use(bodyParser.json())

// global chatroom that all messages are posted to
const chatroom = new EventEmitter()

// subscribe to events
app.get('/events', (req, res) => {
  const {name} = req.query

  // create a new EventSource emitter
  const sauce = new EventSourceEmitter(req, res, {keepAlive: true})

  // same as (event) => sauce.emit(MESSAGE, event)
  const emitMessage = sauce.emit.bind(sauce, MESSAGE)

  // handle someone closing the browser
  sauce.onClose = () => {
    // unsubscribe from chatroom events
    chatroom.removeListener(MESSAGE, emitMessage)

    // announce that the user has left
    chatroom.emit(MESSAGE, {name, message: 'has left the chat...'})
  }

  // subscribe to chatroom events
  chatroom.on(MESSAGE, emitMessage)

  // welcome the user to the chat
  chatroom.emit(MESSAGE, {name, message: 'has joined the chat...'})
})

// broadcast a message to the chatroom
app.post('/chat', (req, res) => {
  const {name, message} = req.body
  chatroom.emit(MESSAGE, {name, message})
  res.end()
})

app.listen(8080)
