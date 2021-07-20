const { time } = require("@openzeppelin/test-helpers");

module.exports = function(callback) {
    // perform actions
    const { time } = require("@openzeppelin/test-helpers");
    await time.increase(time.duration.days(7));
  }