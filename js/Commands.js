client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    if (user === client.user) return // reaction.me is buggy
    const departmentShort = await getShiftsMessageIdDepartment(reaction.message.guild.id, reaction.message.id)
    if (!departmentShort) return

    if (reaction.emoji.name === '🚔') {
        reaction.users.remove(user)
        if (await isUserOnduty(reaction.message.guild.id, departmentShort, user.id)) {
            const msg = await reaction.message.channel.send(
                new Discord.MessageEmbed({
                    color: 16727871,
                    author: { name: reaction.message.guild.member(user.id).displayName },
                    description: 'You are already on-duty'
                })
            )
            msg.delete({ timeout: 5000 })
        } else {
            startShift(reaction.message.guild.id, departmentShort, user.id)
            const msg = await reaction.message.channel.send(
                new Discord.MessageEmbed({
                    color: 65280,
                    author: { name: reaction.message.guild.member(user.id).displayName },
                    description: 'Started shift. Make sure to go Onduty in the main server!'
                })
            )
            msg.delete({ timeout: 5000 })
        }

      } else if (reaction.emoji.name === '❌') {
      reaction.users.remove(user)
      if (!await isUserOnduty(reaction.message.guild.id, departmentShort, user.id)) {
          const msg = await reaction.message.channel.send(
              new Discord.MessageEmbed({
                  color: 16727871,
                  author: { name: reaction.message.guild.member(user.id).displayName },
                  description: 'You are already off-duty'
              })
          )
          msg.delete({ timeout: 5000 })
      } else {
          const member = reaction.message.guild.member(user.id)

          const time = await endShiftAndGetTime(reaction.message.guild.id, departmentShort, user.id)
          if (!time) {
              await reaction.message.channel.send(
                  new Discord.MessageEmbed({
                      color: 16727871,
                      author: { name: member.displayName },
                      description: 'Something went wrong. (No time in database)'
                  })
              )
              return
          }
          const msg = await reaction.message.channel.send(
              new Discord.MessageEmbed({
                  color: 65280,
                  author: { name: member.displayName },
                  description: 'Ended shift. Make sure to go Offduty in the main server!',
                  footer: { text: `Total time clocked: ${parseTime(time)}` }
              })
          )
          msg.delete({ timeout: 5000 })
[6:48 PM]
         const logChannelId = await getLogChannelId(reaction.message.guild.id, departmentShort)
          if (logChannelId && client.channels.cache.has(logChannelId)) {
              const logChannel = await client.channels.fetch(logChannelId)
              logChannel.send(
                  new Discord.MessageEmbed({
                      author: { name: member.tag },
                      color: 6539241,
                      fields: [
                          { name: 'Name', value: member.displayName },
                          { name: 'Department', value: await getDepartmentName(reaction.message.guild.id, departmentShort) },
                          { name: 'Shift Total Time', value: parseTime(time) },
                      ]
                  })
              )
          }
      }
  }
})
