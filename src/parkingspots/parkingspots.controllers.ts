import { Body, Controller, Get, Post } from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CreateParkingSpotDto } from './dto/create-parkingspot.dto';
import { ParkingSpotsPolicy } from './parkingspots.policy';
import { ParkingSpotsService } from './parkingspots.service';

@Controller('parkingspots')
export class ParkingSpotsController {
  constructor(private readonly parkingSpotsService: ParkingSpotsService) {}

  @Post()
  @Can(ParkingSpotsPolicy, 'create')
  create(@Body() datos: CreateParkingSpotDto) {
    return this.parkingSpotsService.create(datos);
  }

  @Get()
  @Can(ParkingSpotsPolicy, 'list')
  list() {
    return this.parkingSpotsService.list();
  }
}