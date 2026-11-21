#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "JCHeroCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
class UJCAbilityOverlay;

UCLASS()
class JCHOLYOG_API AJCHeroCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AJCHeroCharacter();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    UFUNCTION(BlueprintCallable, Category="JC|Flight")
    void ToggleFlight();

    UFUNCTION(BlueprintCallable, Category="JC|Flight")
    void SetBoostHeld(bool bHeld);

    UFUNCTION(BlueprintCallable, Category="JC|Flight")
    void SetAscendHeld(bool bHeld);

    UFUNCTION(BlueprintCallable, Category="JC|Flight")
    void SetDescendHeld(bool bHeld);

    UFUNCTION(BlueprintCallable, Category="JC|Abilities")
    void CastLightning();

    UFUNCTION(BlueprintImplementableEvent, Category="JC|Abilities")
    void OnLightningRequested(const FVector& Start, const FVector& End);

private:
    void MoveForward(float Value);
    void MoveRight(float Value);
    void LookYaw(float Value);
    void LookPitch(float Value);
    void PressBoost();
    void ReleaseBoost();
    void PressAscend();
    void ReleaseAscend();
    void PressDescend();
    void ReleaseDescend();

    UPROPERTY(VisibleAnywhere, Category="JC|Camera")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, Category="JC|Camera")
    TObjectPtr<UCameraComponent> FollowCamera;

    UPROPERTY(VisibleAnywhere, Category="JC|Visual")
    TObjectPtr<UStaticMeshComponent> PlaceholderBody;

    UPROPERTY(Transient)
    TObjectPtr<UJCAbilityOverlay> MobileOverlay;

    bool bFlying = false;
    bool bBoostHeld = false;
    bool bAscendHeld = false;
    bool bDescendHeld = false;
};
