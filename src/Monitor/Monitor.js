import React from 'react';
import './Monitor.css';

function Message(props) {
    const message = props.message;
    const showLogo = props.showLogo;
    const imageUrl = props.imageUrl;

    return (
        <div id='monitor'>
            {<img src={imageUrl} alt=""></img>}
            {!showLogo && <div>
                <div>{message.line1}</div>
                <div>{message.line2}</div>
            </div>}
        </div>
    );
}

export default Message;