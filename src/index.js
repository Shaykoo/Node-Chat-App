// It's always a server , main server file
const path = require('path') 
const express = require('express')
const http = require('http')
const app = express()
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser,  getUsersInRoom} = require('./utils/users')


const server = http.createServer(app)  // Creating own server outside express library and confugring our express app in it
const io = socketio(server) // now our server supports web sockets 

const port = process.env.PORT || 3000
const publicDirPath = path.join(__dirname,'../public')

app.use(express.static(publicDirPath))

io.on('connection', (socket)=>{  // will work everytime a new client connects
    console.log('Web server is ready to get connected to clients')

    socket.on('join', ( options, callback)=>{
        const { error, user } = addUser({ id: socket.id, ...options }) //using rest parameter
        
        if(error){
            return callback(error)
        } 
        
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin',`Welcome ${user.username}`))   //emit to all the new client's connection to server 
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`)) //emit to all the connected clients but not to the newely connected one
   
        //sending room name and user's list to the client
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        }) 

        callback()
    })

    socket.on('sendMessage', (message, callback)=>{  // send to all the clients new and old
       
       const user = getUser(socket.id)


       const filter = new Filter()

       if(filter.isProfane(message)){
           return callback('Profanity is not allowed') // ackoledgement when profanity is used
       }
       
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (location, callback)=>{
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`)) 
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            }) 
        }
  
    })

})

server.listen(port, ()=>{    // starting the server using http
    console.log(`Server is running on port ${port}!`)
})