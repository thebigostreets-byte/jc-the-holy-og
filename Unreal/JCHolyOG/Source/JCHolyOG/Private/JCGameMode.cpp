#include "JCGameMode.h"
#include "JCHeroCharacter.h"
#include "Engine/World.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/DirectionalLight.h"
#include "Components/StaticMeshComponent.h"
#include "Components/LightComponent.h"

AJCGameMode::AJCGameMode()
{
    DefaultPawnClass = AJCHeroCharacter::StaticClass();
}

void AJCGameMode::StartPlay()
{
    // Temporary native proving ground, NOT imported Las Vegas city geometry.
    // Replace with streamed Unreal World Partition cells after the asset port.
    if (UWorld* World = GetWorld())
    {
        UStaticMesh* Cube = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube"));
        if (Cube)
        {
            AStaticMeshActor* Ground = World->SpawnActor<AStaticMeshActor>(
                FVector(0.f, 0.f, -160.f), FRotator::ZeroRotator);
            if (Ground)
            {
                Ground->GetStaticMeshComponent()->SetStaticMesh(Cube);
                Ground->GetStaticMeshComponent()->SetCollisionProfileName(TEXT("BlockAll"));
                Ground->SetActorScale3D(FVector(200.f, 200.f, 1.f));
            }

            for (int32 Index = 0; Index < 4; ++Index)
            {
                AStaticMeshActor* Tower = World->SpawnActor<AStaticMeshActor>(
                    FVector(550.f + Index * 650.f, 1000.f, 400.f + Index * 150.f),
                    FRotator::ZeroRotator);
                if (Tower)
                {
                    Tower->GetStaticMeshComponent()->SetStaticMesh(Cube);
                    Tower->GetStaticMeshComponent()->SetCollisionProfileName(TEXT("BlockAll"));
                    Tower->SetActorScale3D(FVector(2.f, 2.f, 10.f + Index * 3.f));
                }
            }
        }

        ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(
            FVector::ZeroVector, FRotator(-50.f, -35.f, 0.f));
        if (Sun && Sun->GetLightComponent())
        {
            Sun->GetLightComponent()->SetIntensity(8.f);
        }
    }
    Super::StartPlay();
}
