import React from 'react';
import './Monitor.scss';

function Message(props) {
    const message = props.message;
    const imageUrl = props.imageUrl;

    return (
        <div id='monitor'>
            {imageUrl === 'logo' && <img src={require('../Resources/jeopardy_logo.jpeg')} alt=""></img>}
            {imageUrl && imageUrl !== 'logo' && <img src={imageUrl} alt=""></img>}  
            <div>
                <div>{message.line1}</div>
                <div>{message.line2}</div>      
            </div>                           
        </div>
    );
}

export default Message;