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
        <div id='podiums'>
            {names.map(name => {
                return contestants[name] && <div className='podium' key={name}>
                    {name === playerName && responseCountdownIsActive && 
                    <div className='tick-row'>
                        {ticks.map((_tick, index) =>
                            <span key={'tick' + index} className='tick'></span>
                        )}
                    </div>}
                    {!(name === playerName && responseCountdownIsActive) && <span className='tick-row'></span>}
                    <span className='podium-row'>${contestants[name].score}</span>
                    <span className='podium-row name-row'>{name}</span>
                    <span className='big-podium-row'>{contestants[name].response}</span>
                    {contestants[name].response && <span className='podium-row'>${contestants[name].wager}</span>}
                </div>
            })}
        </div>
    );
}

export default Podium;