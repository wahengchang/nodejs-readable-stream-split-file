const fs = require('fs')
const { bytesToSize } = require('./size')
const MAX_CHUNK_LENGTH = 1000

const defaultSaveFile = (path, buf, next) => {
  console.log(`${path} is saving`)
  return fs.writeFile(path, buf, next)
}

const defaultProcessChuck = function(next){
  const {bigChunk} = this
  const bigString = bigChunk.toString('utf8')
  const lastNewLineIndex = bigString.lastIndexOf('\r\n')

  const saveString = bigString.slice(0, lastNewLineIndex)
  const subString = bigString.slice(lastNewLineIndex, -1)
  
  this.bigChunk = new Buffer(subString, "utf-8")
  this.fileCount += 1
  this.saveChunk = new Buffer(saveString, "utf-8")

  next()
}

const defaultErrorHandler = err => console.log('Error -> ' + err)

const defaultEndHandler = (self) => {
  console.log(' -=-=-=-=-=-=-=-=-=-=')
  console.log('File size  : ', bytesToSize(self.sizeCount))
  console.log(' -=-=-=-=-=-=-=-=-=-=')
}

const defaultProcessCondition = () => true

function ChunkPartition (readableStream, {maxChunkLength}) {
  this.sizeCount = 0
  this.fileCount = 0
  this.bigChunk = new Buffer(0)
  this.saveFile = null
  this.errorHandler = null
  this.endHandler = null
  this.processChuck = null
  this.saveChunk = new Buffer(0)
  this.processCondition = null
  this.readStream = readableStream
  this.MAX_CHUNK_LENGTH = maxChunkLength

  this.readStream.pause()

  this.readStream.on('error', function (err) {
    if (this.errorHandler) return this.errorHandler(err)
    return defaultErrorHandler(err)
  })

  this.readStream.on('end', () => {
    if (this.endHandler) return this.endHandler()
    return defaultEndHandler(this)
  })

  this.readStream.on('data', _chunk => {
    const { readStream, MAX_CHUNK_LENGTH } = this
    const processCondition = this.processCondition || defaultProcessCondition
    const processChuck = this.processChuck.bind(this) || defaultProcessChuck.bind(this)
    const saveFile = this.saveFile || defaultSaveFile

    this.sizeCount += _chunk.length
    this.bigChunk =Buffer.concat([this.bigChunk, _chunk])

    // skip when string is not long enough
    if (this.bigChunk.length <= MAX_CHUNK_LENGTH) return

    // skip when file save condition is not statisfied
    if( !processCondition(this.bigChunk)) return

    readStream.pause()

    processChuck(() => {
      saveFile(this.fileCount, this.saveChunk, function(){
        readStream.resume()
      })
    })
  })
}

ChunkPartition.prototype.start = function () {
  this.readStream.resume()
}

module.exports = ChunkPartition
