#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "JCAbilityOverlay.generated.h"

class UCanvasPanel;

UCLASS()
class JCHOLYOG_API UJCAbilityOverlay : public UUserWidget
{
    GENERATED_BODY()

protected:
    virtual void NativeOnInitialized() override;

private:
    UFUNCTION() void FlightClicked();
    UFUNCTION() void BoostPressed();
    UFUNCTION() void BoostReleased();
    UFUNCTION() void UpPressed();
    UFUNCTION() void UpReleased();
    UFUNCTION() void DownPressed();
    UFUNCTION() void DownReleased();
    UFUNCTION() void LightningClicked();
};
