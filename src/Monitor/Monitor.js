import React from 'react';
import './Monitor.css';

function Message(props) {
    const message = props.message;

    return (
        <div className='monitor'>
            <div>{message.line1}</div>
            <div>{message.line2}</div>
        </div>
    );
}

export default Message;