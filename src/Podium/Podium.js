import React, { useState, useEffect } from 'react';
import Timeout from './timeout.mp3';
import './Podium.css';

function Podium(props) {
    const contestants = props.contestants;
    const responseCountdownIsActive = props.startTimer;
    const names = Object.keys(contestants);
    let [ticks, setTicks] = useState(new Array(9).fill(true));
    let responseCountdown = 4;
    let responseCountdownInterval = {};
    let timeout = new Audio(Timeout);

    // 5 second timer to respond after my name is called
    useEffect(() => {
        if (responseCountdownIsActive) {
            responseCountdownInterval = setInterval(() => {
                if (responseCountdown === 0) {
                    clearInterval(responseCountdownInterval);
                    timeout.play();
                } else {
                    setTicks(new Array(responseCountdown*2-1).fill(true));
                }
                responseCountdown -= 1;
            }, 1000);
        } else {
            setTicks(new Array(9).fill(true));
        }
        return () => clearInterval(responseCountdownInterval);
    }, [responseCountdownIsActive]);

    return (
        <div className='podiums'>
            <div className='ticks'>
                {responseCountdownIsActive && ticks.map((_tick, index) =>
                    <div key={'tick'+index} className='tick'></div>
                )}
            </div>
            {names.map(name =>
                <div className='podium' key={name}>
                    <div>${contestants[name] && contestants[name].score}</div>
                    <div>{name}</div>
                    <div>{contestants[name] && contestants[name].response}</div>
                    <div>{contestants[name] && contestants[name].wager}</div>
                </div>
            )}
        </div>
    );
}

export default Podium;