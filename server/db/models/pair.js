const Sequelize = require('sequelize')
const db = require('../db')

const Pair = db.define('pair', {
  partner: {
    type: Sequelize.STRING,
    allowNull: false
  },
  review: {
    type: Sequelize.INTEGER
  }
})

module.exports = Pair
