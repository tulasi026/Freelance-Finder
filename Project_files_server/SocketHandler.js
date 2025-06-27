import { Chat, Project } from "./Schema.js";
import {v4 as uuid} from 'uuid';

const SocketHandler = (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Handle connection errors
    socket.on("error", (error) => {
        console.error('Socket error:', error);
    });

    socket.on("join-chat-room", async ({projectId, freelancerId}) => {
        try {
            const project = await Project.findById(projectId);
            if (!project) {
                return socket.emit('error', 'Project not found');
            }

            if (project.freelancerId === freelancerId) {
                await socket.join(projectId);
                console.log(`Freelancer ${freelancerId} joined room ${projectId}`);
                
                let chat = await Chat.findById(projectId);
                if (!chat) {
                    chat = new Chat({
                        _id: projectId,
                        messages: []
                    });
                    await chat.save();
                }
                
                socket.emit('messages-updated', { chat });
                socket.to(projectId).emit('user-joined-room');
            }
        } catch (error) {
            console.error('Join chat room error:', error);
            socket.emit('error', 'Internal server error');
        }
    });

    // Similar improvements for join-chat-room-client...

    socket.on('new-message', async ({ projectId, senderId, message, time }) => {
        try {
            const updatedChat = await Chat.findOneAndUpdate(
                { _id: projectId },
                { 
                    $push: { 
                        messages: { 
                            id: uuid(), 
                            text: message, 
                            senderId, 
                            time 
                        } 
                    } 
                },
                { new: true, upsert: true }
            );
            
            io.to(projectId).emit('messages-updated', { chat: updatedChat });
        } catch (error) {
            console.error('New message error:', error);
            socket.emit('error', 'Failed to send message');
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
};

export default SocketHandler;