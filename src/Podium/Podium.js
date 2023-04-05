import React, { useState, useEffect } from 'react';
import Timeout from '../Resources/timeout.mp3';
import './Podium.css';

function Podium(props) {
    const contestants = props.contestants;
    const responseCountdownIsActive = props.startTimer;
    const playerName = props.playerName;
    const names = Object.keys(contestants);
    let [ticks, setTicks] = useState(new Array(9).fill(true));

    // 5 second timer to respond after my name is called
    useEffect(() => {
        let responseCountdownInterval = {};
        let timeout = new Audio(Timeout);
        let responseCountdown = 4;
        if (responseCountdownIsActive) {
            responseCountdownInterval = setInterval(() => {
                if (responseCountdown === 0) {
                    clearInterval(responseCountdownInterval);
                    timeout.play();
                } else {
                    setTicks(new Array(responseCountdown * 2 - 1).fill(true));
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
            {names.map(name => {
                return contestants[name] && <div className='podium' key={name}>
                    {name === playerName &&
                    <div className='ticks'>
                        {responseCountdownIsActive && ticks.map((_tick, index) =>
                            <div key={'tick' + index} className='tick'></div>
                        )}
                    </div>}
                    {name === playerName && !responseCountdownIsActive && <div className='blank-ticks'></div>}
                    {name !== playerName && <div className='blank-ticks'></div>}
                    <div className='podium-row'>${contestants[name].score}</div>
                    <div className='podium-row'>{name}</div>
                    <div className='podium-row'>{contestants[name].response}</div>
                    {contestants[name].response && <div>${contestants[name].wager}</div>}
                </div>
            })}
        </div>
    );
}

export default Podium;