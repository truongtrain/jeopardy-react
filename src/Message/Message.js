import React from 'react';
import './Message.css';

function Message(props) {
    const message = props.message;

    return (
        <div className='message'>
            <div>{message.line1}</div>
            <div>{message.line2}</div>
        </div>
    );
}

export default Message;