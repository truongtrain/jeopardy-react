import React, {useState, useEffect} from 'react';

function Timer() {
    
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(seconds => seconds + 0.1)
            }, 100)
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }   
        return () => clearInterval(interval);
      }, [seconds]);

      document.addEventListener('click', () => pause());

      function reset() {
        setSeconds(0);
        setIsActive(false);
      }

      function pause() {
        setIsActive(false);
      }

      return (<div>{seconds.toFixed(1)}</div>);
}

export default Timer;