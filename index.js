const express = require('express')
const EventSourceEmitter = require('event-source-emitter')
const EventEmitter = require('events')
const bodyParser = require('body-parser')
const throttle = require('lodash.throttle')

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

  // The actual spec isn't that hard to implement yourself,
  // but I'm really tired and this package means I don't have to think
  const sauce = new EventSourceEmitter(req, res, {keepAlive: true})

  // same as (event) => sauce.emit(MESSAGE, event)
  const emitMessage = sauce.emit.bind(sauce, MESSAGE)

  // this is triggered when a user unsubscribes from chatroom events
  // you can pass this as an option to EventSourceEmitter if you want
  sauce.onClose = () => {
    chatroom.removeListener(MESSAGE, emitMessage)

    // announce that the user has left
    chatroom.emit(MESSAGE, {name, message: 'has left the chat...'})
  }

  // subscribe to chatroom events
  chatroom.on(MESSAGE, emitMessage)

  // everyone else know that a new user has joined
  chatroom.emit(MESSAGE, {name, message: 'has joined the chat...'})
})

// minimum amount of time to wait before sending another message
// this hopefully delays the inevitable
const MIN_TIME = 1000

// store a throttled emit function for each user
// NOTE: this is a memory leak, but I don't really care
const users = {}

// broadcast a message to the chatroom
app.post('/chat', (req, res) => {
  const {name, message} = req.body

  // simple throttling technique to stop `while(1){send('Hi')}`
  const emitFn = users[name] 
    ? users[name]
    : users[name] = throttle(chatroom.emit.bind(chatroom), MIN_TIME)

  emitFn(MESSAGE, {name, message})
  res.end()
})

// start server on port 8080
app.listen(8080)
