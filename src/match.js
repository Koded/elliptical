import _ from 'lodash'
import escapeRegex from 'escape-string-regexp'
// returns a `words` object if its a match, else null

export function match ({input, text, strategy}) {
  const nullInput = nullMatch({input, text})
  if (nullInput) return nullInput

  const inputLower = _.deburr(input.toLowerCase())
  const textLower = _.deburr(text.toLowerCase())

  const partialBeginning = partialBeginningMatch({input, text, inputLower, textLower})
  if (partialBeginning) return partialBeginning

  const fullBeginning = fullBeginningMatch({input, text, inputLower, textLower})
  if (fullBeginning) return fullBeginning

  if (strategy === 'contain' || strategy === 'fuzzy') {
    const anywhere = anywhereMatch({input, text, inputLower, textLower})
    if (anywhere) return anywhere
  }

  if (strategy === 'fuzzy') {
    const fuzzy = fuzzyMatch({input, text, inputLower, textLower})
    if (fuzzy) return fuzzy
  }
}

function nullMatch ({input, text}) {
  if (input == null) {
    return {
      words: [{text, input: false}],
      remaining: null,
      score: 1
    }
  }
}

function partialBeginningMatch ({input, text, inputLower, textLower}) {
  if (_.startsWith(inputLower, textLower)) {
    return {
      words: [{text, input: true}],
      remaining: input.substring(text.length),
      score: 1
    }
  }
}

function fullBeginningMatch ({input, text, inputLower, textLower}) {
  if (_.startsWith(textLower, inputLower)) {
    const words = []
    if (input.length > 0) {
      words.push({text: text.substring(0, input.length), input: true})
    }
    if (text.length > input.length) {
      words.push({text: text.substring(input.length), input: false})
    }

    return {
      words,
      remaining: null,
      score: 1
    }
  }
}

function anywhereMatch ({input, text, inputLower, textLower}) {
  const index = textLower.indexOf(inputLower)

  if (index > -1) {
    const words = []
    const endIndex = index + input.length

    if (index > 0) {
      words.push({text: text.slice(0, index), input: false})
    }

    words.push({text: text.slice(index, endIndex), input: true})

    if (endIndex <= text.length - 1) {
      words.push({text: text.slice(endIndex), input: false})
    }

    return {
      words,
      remaining: null,
      score: 1 - (index / (2 * text.length))
    }
  }

  return null
}

function regexSplit(text) {
  return _.map(text.split(''), escapeRegex)
}

function acronymMatches({inputLower, text}) {
  if (_.includes(text, ' ')) {
    const chars = regexSplit(inputLower)
    const fuzzyString = chars.reduce(
      (a, b) => (`${a}(.*(?:\\s|^))(${b})`),
      '^'
    ) + '(.*)$'
    const fuzzyRegex = new RegExp(fuzzyString, 'i')
    const matches = text.match(fuzzyRegex)
    if (matches) {
      return {score: 0.5, matches}
    }
  }
}

function capitalMatches({inputLower, text}) {
  if (/[A-Z]/.test(text)) {
    const chars = regexSplit(inputLower)
    const fuzzyString = chars.reduce(
      (a, b) => {
        const bUpper = b.toUpperCase()
        return (`${a}([^${bUpper}]*)(${bUpper})`)
      },
      '^'
    ) + '(.*)$'
    const fuzzyRegex = new RegExp(fuzzyString)
    const matches = text.match(fuzzyRegex)
    if (matches) {
      return {score: 0.4, matches}
    }
  }
}

function trueFuzzyMatches({inputLower, text}) {
  const chars = regexSplit(inputLower)
  const fuzzyString = chars.reduce(
    (a, b) => (`${a}([^${b}]*)(${b})`),
    '^'
  ) + '(.*)$'
  const fuzzyRegex = new RegExp(fuzzyString, 'i')
  const matches = text.match(fuzzyRegex)
  if (matches) {
    return {score: 0.3 * (1 / matches.length), matches}
  }
}

function fuzzyMatch({input, text, inputLower, textLower}) {
  const {score, matches} = acronymMatches({inputLower, text}) ||
    capitalMatches({inputLower, text}) || 
    trueFuzzyMatches({inputLower, text}) || {}

  if (matches) {
    const words = []
    for (let i = 1, l = matches.length; i < l; i++) {
      if (matches[i].length > 0) {
        words.push({
          text: matches[i],
          input: i % 2 === 0
        })
      }
    }

    return {
      words,
      remaining: null,
      score
    }
  }
  return null
}

// export function * sort (input, items) {
//   let itemSet = _.map(items, item => ({item, matched: false}))
//
//   for (let [func, score] of [[beginningMatch, 1], [anywhereMatch, 0.5]]) {
//     yield * sortFunction({input, itemSet, func, score})
//   }
// }
//
// function * sortFunction ({input, itemSet, func, score}) {
//   for (let obj of itemSet) {
//     if (!obj.matched) {
//       const words = func({input, text: obj.item.text, qualifier: obj.item.qualifier})
//       if (words) {
//         obj.matched = true
//         _.forEach(words, word => word.descriptor = obj.item.descriptor)
//         yield {words, result: obj.item.value, score}
//       }
//     }
//   }
// }
//
// escape special characters, and wrap in parens (for matching)
// function regexEscape (str) {
//   return `(${str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/, '\\$&')})`
// }

// function beginningMatch ({input, text, qualifier}) {
//   if (_.startsWith(text.toLowerCase(), input.toLowerCase())) {
//     const matches = [{text: text.slice(0, input.length), input: true, qualifier}]
//     if (input.length < text.length) {
//       matches.push({text: text.slice(input.length), input: false, qualifier})
//     }
//     return matches
//   }
//   return null
// }