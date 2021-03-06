const {
  GameLoop,
  init,
  initKeys,
  initPointer,
  keyPressed,
  on,
  track
} = require('kontra')

const loadAssets = require('./assets')
const persistChanges = require('./persistance')
const invitePeers = require('./rtc')
const renderGround = require('./scenes/game.scene')
const renderBall = require('./sprites/ball')
const renderBasket = require('./sprites/basket')
const renderControl = require('./sprites/control')
const renderPlayer = require('./sprites/player')
const renderScore = require('./sprites/score')

const { moveBall, moveOpponent, movePlayer } = require('./update')

;(function () {
  'use strict';
  window.getGlobalData = function () {
    return {
      step: 1,
      model: {
        name: '',
	party: null
      },
      ready: false,
      userInteractions: [],
      init: function () {
	console.log('Alpine ready')
	on('userInteraction', (userInteraction) => {
	  this.userInteractions.push(userInteraction.direction)
	})
      },
      nextStep: function (step) {
        this.step = step
      },
      submit: function () {
	if (this.validates()) {
	  const initialState = {
	    name: this.model.name,
	    party: this.model.party
	  }
	  window.localStorage.setItem('state', JSON.stringify(initialState))

          if (this.model.party === 'multi') {
	    invitePeers(initialState)
	    this.ready = true
	  } else {
	    this.ready = true
	  }
	}
      },
      validates: function () {
	return this.step === 3 && this.model !== '' && this.party !== null
      }
    }
  }
})();

window.onload = async () => {
  'use strict'
  const { canvas, context } = init()

  maybeRescale(canvas, context)
  canvas.onwheel = (event) => event.preventDefault()
  canvas.onmousewheel = (event) => event.preventDefault()

  initKeys()
  initPointer()
  persistChanges()

  const assets = await loadAssets()
  const [ basketImage, groundImage, playerImage, ballImage ] = assets

  const tileEngine = renderGround(groundImage)
  const control = renderControl(groundImage)
  const player = renderPlayer(playerImage, 1)
  const opponent = renderPlayer(playerImage, 2)
  const ball = renderBall(ballImage)
  const playerBasket= renderBasket(basketImage, true)
  const opponentBasket= renderBasket(basketImage, false)
  const playerScore = renderScore(groundImage, true)
  const opponentScore = renderScore(groundImage, false)

  track(control)
  tileEngine.addObject(control)

  tileEngine.addObject(player)
  tileEngine.addObject(opponent)
  tileEngine.addObject(ball)
  tileEngine.addObject(playerBasket)
  tileEngine.addObject(opponentBasket)
  tileEngine.addObject(playerScore)
  tileEngine.addObject(opponentScore)

  on('remote', (payload) => {
    const { dx, dy } = payload
    opponent.x += dx
    opponent.y += dy
  })

  let loop = GameLoop({
    update: () => {
      movePlayer({ player, canvas, tileEngine })
      moveOpponent(opponent, canvas)
      moveBall({
        player,
        opponent,
        ball,
        playerBasket,
        opponentBasket,
        playerScore,
        opponentScore,
      })
    },
    render: () => {
      tileEngine.render()
      control.render()
      playerScore.render()
      opponentScore.render()
      player.render()
      opponent.render()
      playerBasket.render()
      opponentBasket.render()
      ball.render()
    }
  })
  loop.start()

  function maybeRescale (canvas, context) {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    if (windowWidth > canvas.width) {
      return
    }

    if (windowHeight > canvas.height) {
      return
    }

    const scaleWidth = 0.95 * windowWidth / canvas.width
    const scaleHeight = 0.95 * windowHeight / canvas.height

    context.imageSmoothingEnabled = false
    context.scale(scaleWidth, scaleHeight)
  }
}
