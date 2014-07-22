_ = require 'lodash'
async = require 'async'
moment = require 'moment'
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'

if window?.lacona?
	lacona = window.lacona
else
	lacona = require '../src/lacona'

Parser = lacona.Parser

chai.config.includeStack = true
expect = chai.expect

describe 'Parser', ->

	it 'handles without a schema (data is never called)', (done) ->
		dataCalled = sinon.spy()
		new Parser()
		.on 'data', ->
			dataCalled()
		.on 'end', ->
			expect(dataCalled).to.not.have.been.called
			done()
		.parse()

	it 'handles schemata in different languages', (done) ->
		testCases = [
			input: 'pr'
			desc: 'basic language choice'
			schema:
				grammars: [
					lang: ['en', 'default']
					root: 'test'
				,
					lang: ['es']
					root: 'prueba'
				]
				run: ''
			matches: 1
			suggestion: 'prueba'
			language: 'es'
		,
			input: 'tr'
			desc: 'language fallback'
			schema:
				grammars: [
					lang: ['en_GB', 'default']
					root: 'lorry'
				,
					lang: ['en']
					root: 'truck'
				]
				run: ''
			matches: 1
			suggestion: 'truck'
			language: 'en_US'
		,
			input: 'pr'
			desc: 'default (browser)'
			schema:
				grammars: [
					lang: ['es']
					root: 'prueba'
				,
					lang: ['en', 'default']
					root: 'test'
				]
				run: ''
			matches: 1
			suggestion: 'prueba'
			setDefault: ->
				if window?
					window.navigator =
						language: 'es_ES'
				else if process?
					process.env.LANG = 'es_ES.UTF-8'
		]

		async.each testCases, (testCase, done) ->
			dataCalled = sinon.spy()
			if testCase.setDefault?
				testCase.setDefault()

			new Parser()
			.understand testCase.schema
			.on 'data', (data) ->
				expect(data.suggestion.words[0].string, testCase.desc).to.equal testCase.suggestion
				dataCalled()
			.on 'end', ->
				expect(dataCalled, testCase.desc).to.have.callCount(testCase.matches)
				done()
			.parse(testCase.input, testCase.language)
		, done


	it 'will not throw data for an old parse', (done) ->
		testCase =
			input: 'test'
			delay:
				scope:
					delay: (result, done) ->
						process.nextTick done
				schema:
					name: 'delay'
					root: 'test'
					evaluate: 'delay'
			schema:
				root:
					type: 'delay'
				run: ''
			called: 1

		dataCalled = sinon.spy()
		new Parser()
		.understand testCase.delay
		.understand testCase.schema
		.on 'data', (data) ->
			dataCalled()
		.on 'end', ->
			expect(dataCalled).to.have.been.called.once
			done()
		.parse(testCase.input)
		.parse(testCase.input)


	it 'handles a schema with a single literal (fuzzy)', (done) ->
		testCases = [
			desc: 'basic'
			input: 'ral'
			schema:
				root: 'literal test'
				run: ''
			options:
				fuzzy: true
			matches: 1
			charactersComplete: 7
			suggestion: 'literal test'
			result: {}
		,
			desc: 'with value'
			input: 'ttt'
			schema:
				root:
					type: 'literal'
					display: 'literal test'
					value: 'test'
					id: 'theLiteral'
				run: ''
			options:
				fuzzy: true
			matches: 1
			charactersComplete: 12
			suggestion: 'literal test'
			result:
				theLiteral: 'test'
		]
		async.each testCases, (testCase, done) ->
			dataCalled = sinon.spy()

			new Parser(testCase.options)
			.understand testCase.schema
			.on 'data', (data) ->
				expect(data, testCase.desc).to.exist
				expect(data.suggestion, testCase.desc).to.exist
				expect(data.suggestion.words, testCase.desc).to.have.length 1
				expect(data.suggestion.charactersComplete, testCase.desc).to.equal testCase.charactersComplete
				expect(data.suggestion.words[0].string, testCase.desc).to.equal testCase.suggestion
				expect(data.result, testCase.desc).to.deep.equal testCase.result
				dataCalled()
			.on 'end', ->
				expect(dataCalled, testCase.desc).to.have.callCount(testCase.matches)
				done()
			.parse(testCase.input)
		, done