import React from 'react';
import './Podium.css';

function Podium(props) {
    const contestants = props.contestants;
    const names = Object.keys(contestants);
    const ticks = new Array(9).fill(true);

    return (
        <div className='podiums'>
            <div className='ticks'>
                {ticks.map(_tick =>
                    <div className='tick'></div>
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