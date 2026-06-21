package com.champion_sports.backend.balls;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/balls")
@CrossOrigin(origins = "*")
public class BallController {

    private final BallService ballService;

    public BallController(BallService ballService) {
        this.ballService = ballService;
    }

    @GetMapping("/innings/{inningsId}")
    public List<Ball> getBallsByInnings(
            @PathVariable Long inningsId
    ) {
        return ballService.getBallsByInnings(inningsId);
    }

    @PostMapping
    public Ball addBall(@RequestBody Ball ball) {
        return ballService.addBall(ball);
    }

    @DeleteMapping("/undo/{inningsId}")
    public void undoLastBall(@PathVariable Long inningsId) {
        ballService.undoLastBall(inningsId);
    }
}