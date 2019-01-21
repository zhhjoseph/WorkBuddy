const path = require('path')
const express = require('express')
const morgan = require('morgan')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const db = require('./db')
const sessionStore = new SequelizeStore({db})
const {CLIENT_ID, CLIENT_SECRET, SLACK_TOKEN, BOT_TOKEN} = require('../secrets')
const PORT = process.env.PORT || 8080
const app = express()
const socketio = require('socket.io')
const {WebClient} = require('@slack/client')
const Slackbot = require('slackbots')
module.exports = app

// This is a global Mocha hook, used for resource cleanup.
// Otherwise, Mocha v4+ never quits after tests.
if (process.env.NODE_ENV === 'test') {
  after('close the session store', () => sessionStore.stopExpiringSessions())
}

/**
 * In your development environment, you can keep all of your
 * app's secret API keys in a file called `secrets.js`, in your project
 * root. This file is included in the .gitignore - it will NOT be tracked
 * or show up on Github. On your production server, you can add these
 * keys as environment variables, so that they can still be read by the
 * Node process on process.env
 */
if (process.env.NODE_ENV !== 'production') require('../secrets')

// passport registration
passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.models.user.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

const slackToken = SLACK_TOKEN

const web = new WebClient(slackToken)

const bot = new Slackbot({
  token: BOT_TOKEN,
  name: 'WorkBuddy'
})

//bot start handler

bot.on('start', () => {
  const params = {
    icon_emoji: ':smiley:'
  }

  bot.postMessageToChannel('buddies', 'Lets get matched up!', params)
})

// Error handler
bot.on('error', err => console.log(err))

// Message Handler
// bot.on('message', data => {
//   if (data.type !== 'message') {

//   }
// })

bot.on('message', async data => {
  if (data.text === '<@UFH8A6D6V> userlist') {
    const userdata = await bot.getUsers()
    const {members} = userdata
    console.log(members)
    const memberList = members
      .map(function(elem) {
        return elem.real_name
      })
      .reduce((accum, val) => {
        return accum + ' || ' + val
      }, '')

    bot.postMessageToChannel('buddies', memberList)
  }
})

bot.on('message', data => {
  const params = {
    text:
      'I hope you had a great time with your pair!\nI wanted to check in on how things went. ',
    attachments: [
      {
        text: 'How was your pairing experience?',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [
          {
            name: 'reaction',
            text: ':heart_eyes:',
            type: 'button',
            value: 'heart'
          },
          {
            name: 'reaction',
            text: ':grin:',
            type: 'button',
            value: 'grin'
          },
          {
            name: 'reaction',
            text: ':slightly_smiling_face:',
            type: 'button',
            value: 'slightsmile'
          },
          {
            name: 'reaction',
            text: ':neutral_face:',
            type: 'button',
            value: 'neutral'
          },
          {
            name: 'reaction',
            text: ':slightly_frowning_face:',
            type: 'button',
            value: 'frowning'
          }
        ]
      }
    ]
  }
  if (data.text === '<@UFH8A6D6V> testDM') {
    bot.postMessageToUser('zhhjoseph', 'testDM', params)
  }
})

bot.on('message', async data => {
  const params = {
    icon_emoji: ':clap:',
    text:
      'I hope you had a great time with your pair!\nI wanted to check in on how things went. ',
    attachments: [
      {
        text: 'How was your pairing experience?',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [
          {
            name: 'reaction',
            text: ':heart_eyes:',
            type: 'button',
            value: '5'
          },
          {
            name: 'reaction',
            text: ':grin:',
            type: 'button',
            value: '4'
          },
          {
            name: 'reaction',
            text: ':slightly_smiling_face:',
            type: 'button',
            value: '3'
          },
          {
            name: 'reaction',
            text: ':neutral_face:',
            type: 'button',
            value: '2'
          },
          {
            name: 'reaction',
            text: ':slightly_frowning_face:',
            type: 'button',
            value: '1'
          }
        ]
      }
    ]
  }
  if (data.text === '<@UFH8A6D6V> pair') {
    const userdata = await bot.getUsers()
    const {members} = userdata
    const memberList = members.map(function(elem) {
      return elem.real_name + ',' + elem.name + ',' + '<@' + elem.id + '>'
    })
    if (memberList.length % 2 !== 0) {
      let unpairedMember = memberList.pop().split(',')[0]
      let unpairedMessage =
        'Sorry ' + unpairedMember + "! We'll try another time!"
      bot.postMessageToChannel('buddies', unpairedMessage)
    }
    let arrayOne = memberList.slice()
    let arrayTwo = memberList.slice()
    arrayOne.sort(function() {
      return 0.5 - Math.random()
    })
    arrayTwo.sort(function() {
      return 0.5 - Math.random()
    })
    let pairedArr = []
    while (arrayOne.length) {
      let pair1 = arrayOne[0]
      let pair2 = arrayTwo[0]
      let pair1name = pair1.split(',')[0]
      let pair2name = pair2.split(',')[0]
      let finalpair = pair1name + ' is getting paired with ' + pair2name + ' !'
      let pair1user = pair1.split(',')[1]
      let pair2user = pair2.split(',')[1]
      let pair1Id = pair1.split(',')[2]

      let pair2Id = pair2.split(',')[2]
      let pair1msg = 'Hi! You are paired with ' + pair2Id + '!'
      let pair2msg = 'Hi! You are paired with ' + pair1Id + '!'
      if (
        pair1 !== pair2 &&
        !pairedArr.includes(pair1) &&
        !pairedArr.includes(pair2)
      ) {
        bot.postMessageToChannel('buddies', finalpair)
        bot.postMessageToUser(pair1user, pair1msg)
        bot.postMessageToUser(pair1user, 'test', params)
        bot.postMessageToUser(pair2user, pair2msg)
        bot.postMessageToUser(pair2user, 'test', params)
        pairedArr.push(pair1)
        pairedArr.push(pair2)
      } else if (pair1 === pair2) {
        arrayTwo.shift()
      } else if (pairedArr.includes(pair1)) {
        arrayOne.shift()
      } else if (pairedArr.includes(pair2)) {
        arrayTwo.shift()
      } else {
        console.log('hey')
      }
    }
  }
})

const createApp = () => {
  // logging middleware
  app.use(morgan('dev'))

  // body parsing middleware
  app.use(express.json())
  app.use(express.urlencoded({extended: true}))

  // compression middleware
  app.use(compression())

  // session middleware with passport
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'my best friend is Cody',
      store: sessionStore,
      resave: false,
      saveUninitialized: false
    })
  )
  app.use(passport.initialize())
  app.use(passport.session())

  // auth and api routes
  app.use('/slack', require('./routes'))
  app.use('/auth', require('./auth'))
  app.use('/api', require('./api'))

  // static file-serving middleware
  app.use(express.static(path.join(__dirname, '..', 'public')))

  // any remaining requests with an extension (.js, .css, etc.) send 404
  app.use((req, res, next) => {
    if (path.extname(req.path).length) {
      const err = new Error('Not found')
      err.status = 404
      next(err)
    } else {
      next()
    }
  })

  // sends index.html
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/index.html'))
  })

  // error handling endware
  app.use((err, req, res, next) => {
    console.error(err)
    console.error(err.stack)
    res.status(err.status || 500).send(err.message || 'Internal server error.')
  })
}

app.get('/', function(req, res) {
  res.send('WorkBuddy is working! Path Hit: ' + req.url)
})

app.get('/oauth', function(req, res) {
  // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
  if (!req.query.code) {
    res.status(500)
    res.send({Error: "Looks like we're not getting code."})
    console.log("Looks like we're not getting code.")
  } else {
    // If it's there...

    // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    request(
      {
        url: 'https://slack.com/api/oauth.access', //URL to hit
        qs: {
          code: req.query.code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        }, //Query string data
        method: 'GET' //Specify the method
      },
      function(error, response, body) {
        if (error) {
          console.log(error)
        } else {
          res.json(body)
        }
      }
    )
  }
})

//basic post
app.post('/command', function(req, res) {
  res.send('Joe is the spy!')
})

app.post('/users', function(req, res) {
  request(
    {
      url: 'https://slack.com/api/apps.permissions.users.list', //URL to hit
      qs: {
        code: req.query.code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }, //Query string data
      method: 'GET' //Specify the method
    },
    function(error, response, body) {
      if (error) {
        console.log(error)
      } else {
        console.log(body)
      }
    }
  )
})

const startListening = () => {
  // start listening (and create a 'server' object representing our server)
  const server = app.listen(PORT, () =>
    console.log(`Mixing it up on port ${PORT}`)
  )

  // set up our socket control center
  const io = socketio(server)
  require('./socket')(io)
}

const syncDb = () => db.sync()

async function bootApp() {
  await sessionStore.sync()
  await syncDb()
  await createApp()
  await startListening()
}
// This evaluates as true when this file is run directly from the command line,
// i.e. when we say 'node server/index.js' (or 'nodemon server/index.js', or 'nodemon server', etc)
// It will evaluate false when this module is required by another module - for example,
// if we wanted to require our app in a test spec
if (require.main === module) {
  bootApp()
} else {
  createApp()
}
