import { useRef, useEffect } from 'react';

declare global {
    interface Window { THREE: any; }
}

export const usePlayerControls = (mountRef: React.RefObject<HTMLElement>) => {
    const { THREE } = window;
    const move = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false, boost: false });
    const look = useRef({ lat: 0, lon: 0 });
    const playerMoveRef = useRef({
        lookVec: new THREE.Vector3(),
        speed: 0.5,
        ...move.current
    });

    useEffect(() => {
        const rendererElement = mountRef.current;
        if (!rendererElement) return;

        // Determine if the device is mobile based on touch capability
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 'w': move.current.forward = true; break;
                case 's': move.current.backward = true; break;
                case 'a': move.current.left = true; break;
                case 'd': move.current.right = true; break;
                case ' ': e.preventDefault(); move.current.up = true; break;
                case 'shift': move.current.boost = true; break;
                case 'control': e.preventDefault(); move.current.down = true; break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 'w': move.current.forward = false; break;
                case 's': move.current.backward = false; break;
                case 'a': move.current.left = false; break;
                case 'd': move.current.right = false; break;
                case ' ': move.current.up = false; break;
                case 'shift': move.current.boost = false; break;
                case 'control': move.current.down = false; break;
            }
        };
        const handleClick = () => {
             if (document.pointerLockElement !== rendererElement) {
                // Fix: The requestPointerLock method is typed as returning void in some environments,
                // so we can't use .catch for error handling. The browser will log any errors.
                rendererElement.requestPointerLock();
            }
        }
        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === rendererElement) {
                look.current.lon += e.movementX * 0.1;
                look.current.lat -= e.movementY * 0.1;
                look.current.lat = Math.max(-85, Math.min(85, look.current.lat));
            }
        };

        const lookTouch = { id: -1, lastX: 0, lastY: 0 };
        const moveTouch = { id: -1, startX: 0, startY: 0 };
        const joystickContainer = document.getElementById('joystick-container');
        const joystickHandle = document.getElementById('joystick-handle');
        const actionUp = document.getElementById('action-up');
        const actionDown = document.getElementById('action-down');
        const actionBoost = document.getElementById('action-boost');

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                if (touch.clientX > window.innerWidth / 2 && lookTouch.id === -1) {
                    const target = e.target as HTMLElement;
                    if (target.classList.contains('action-btn')) continue;
                    lookTouch.id = touch.identifier;
                    lookTouch.lastX = touch.clientX;
                    lookTouch.lastY = touch.clientY;
                } else if (touch.clientX <= window.innerWidth / 2 && moveTouch.id === -1) {
                    moveTouch.id = touch.identifier;
                    moveTouch.startX = touch.clientX;
                    moveTouch.startY = touch.clientY;
                    if (joystickContainer) {
                        joystickContainer.style.display = 'flex';
                        joystickContainer.style.left = `${touch.clientX - 60}px`;
                        joystickContainer.style.top = `${touch.clientY - 60}px`;
                    }
                }
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            for (const touch of Array.from(e.changedTouches)) {
                if (touch.identifier === lookTouch.id) {
                    const dx = touch.clientX - lookTouch.lastX;
                    const dy = touch.clientY - lookTouch.lastY;
                    look.current.lon += dx * 0.2;
                    look.current.lat -= dy * 0.2;
                    look.current.lat = Math.max(-85, Math.min(85, look.current.lat));
                    lookTouch.lastX = touch.clientX;
                    lookTouch.lastY = touch.clientY;
                } else if (touch.identifier === moveTouch.id) {
                    const dx = touch.clientX - moveTouch.startX;
                    const dy = touch.clientY - moveTouch.startY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    if (joystickHandle) {
                       const maxDist = 60;
                       const clampedDist = Math.min(dist, maxDist);
                       joystickHandle.style.transform = `translate(${clampedDist * Math.cos(angle)}px, ${clampedDist * Math.sin(angle)}px)`;
                    }
                    if (dist > 20) { // Deadzone
                        move.current.forward = dy < -10;
                        move.current.backward = dy > 10;
                        move.current.left = dx < -10;
                        move.current.right = dx > 10;
                    } else {
                        move.current.forward = move.current.backward = move.current.left = move.current.right = false;
                    }
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            for (const touch of Array.from(e.changedTouches)) {
                if (touch.identifier === lookTouch.id) {
                    lookTouch.id = -1;
                } else if (touch.identifier === moveTouch.id) {
                    moveTouch.id = -1;
                    move.current.forward = move.current.backward = move.current.left = move.current.right = false;
                    if (joystickContainer) joystickContainer.style.display = 'none';
                    if (joystickHandle) joystickHandle.style.transform = 'translate(0, 0)';
                }
            }
        };

        if (isMobile) {
            rendererElement.addEventListener('touchstart', handleTouchStart);
            rendererElement.addEventListener('touchmove', handleTouchMove);
            rendererElement.addEventListener('touchend', handleTouchEnd);
            rendererElement.addEventListener('touchcancel', handleTouchEnd);
            actionUp?.addEventListener('touchstart', () => move.current.up = true);
            actionUp?.addEventListener('touchend', () => move.current.up = false);
            actionDown?.addEventListener('touchstart', () => move.current.down = true);
            actionDown?.addEventListener('touchend', () => move.current.down = false);
            actionBoost?.addEventListener('touchstart', () => move.current.boost = true);
            actionBoost?.addEventListener('touchend', () => move.current.boost = false);
        } else {
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            rendererElement.addEventListener('click', handleClick);
            document.addEventListener('mousemove', handleMouseMove);
        }

        let animationFrameId: number;
        const update = () => {
            const phi = THREE.MathUtils.degToRad(90 - look.current.lat);
            const theta = THREE.MathUtils.degToRad(look.current.lon);
            playerMoveRef.current.lookVec.set(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            );
            playerMoveRef.current.speed = (move.current.boost ? 3 : 1) * 0.5;
            Object.assign(playerMoveRef.current, move.current);
            animationFrameId = requestAnimationFrame(update);
        };
        update();

        return () => {
            if (isMobile) {
                rendererElement.removeEventListener('touchstart', handleTouchStart);
                rendererElement.removeEventListener('touchmove', handleTouchMove);
                rendererElement.removeEventListener('touchend', handleTouchEnd);
                rendererElement.removeEventListener('touchcancel', handleTouchEnd);
                // No need to check for action buttons here as they are cleaned up by React
            } else {
                document.removeEventListener('keydown', handleKeyDown);
                document.removeEventListener('keyup', handleKeyUp);
                rendererElement.removeEventListener('click', handleClick);
                document.removeEventListener('mousemove', handleMouseMove);
            }
            cancelAnimationFrame(animationFrameId);
        };
    }, [mountRef, THREE.MathUtils]);

    return playerMoveRef;
};