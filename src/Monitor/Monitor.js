import React from 'react';
import './Monitor.css';

function Message(props) {
    const message = props.message;
    const showLogo = props.showLogo;

    return (
        <div className='monitor'>
            {showLogo && <img src={require('../Resources/jeopardy_logo.jpeg')}></img>}
            {!showLogo && <div>
                <div>{message.line1}</div>
                <div>{message.line2}</div>
            </div>}
        </div>
    );
}

export default Message;