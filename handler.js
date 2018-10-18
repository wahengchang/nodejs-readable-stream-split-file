const http = require('http')
const fs = require('fs')
const ChunkPartition = require('./lib/ChunkPartition')

const BIGD_FILE_URL_5MB = 'http://norvig.com/big.txt'

http.get(BIGD_FILE_URL_5MB, function(readStream) {
  const options = {maxChunkLength: 50}
  const partition = new ChunkPartition(readStream, options)

  partition.errorHandler = function (err) {
    console.log('[INFO] ', err)
  }
  
  partition.endHandler = function () {
    console.log('[INFO] process done')
  }

  partition.processCondition = function (bigChunk) {
    return bigChunk.toString().includes('\n')
  }

  partition.processChuck = function(next){
    console.log(' -=-=-=-=-= processChuck -=-=-=-=-=')

    const {bigChunk} = this
    const bigString = bigChunk.toString('utf8')
    const lastNewLineIndex = bigString.lastIndexOf('\r\n')
  
    const saveString = bigString.slice(0, lastNewLineIndex)
    const subString = bigString.slice(lastNewLineIndex, -1)
    
    this.bigChunk = new Buffer(subString, "utf-8")
    this.fileCount += 1 //
    this.saveChunk = new Buffer(saveString, "utf-8")

    next()
  }

  partition.saveFile = function(fileCount, buf, next){
    const fileName = `${fileCount}.txt`

    console.log(' -=-=-= going to save file: ', fileName)
    return fs.writeFile(fileName, buf, next)
  }

  partition.start()
})
