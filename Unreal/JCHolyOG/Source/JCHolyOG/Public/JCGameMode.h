#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "JCGameMode.generated.h"

UCLASS()
class JCHOLYOG_API AJCGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AJCGameMode();
    virtual void StartPlay() override;
};
